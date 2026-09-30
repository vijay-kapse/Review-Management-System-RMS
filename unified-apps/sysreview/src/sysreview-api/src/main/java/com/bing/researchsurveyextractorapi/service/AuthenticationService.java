package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.UserDoesNotExistException;
import com.bing.researchsurveyextractorapi.mapper.UserMapper;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.models.UserRole;
import com.bing.researchsurveyextractorapi.pojo.auth.AuthenticationRequest;
import com.bing.researchsurveyextractorapi.pojo.auth.AuthenticationResponse;
import com.bing.researchsurveyextractorapi.pojo.auth.PasswordChangeRequest;
import com.bing.researchsurveyextractorapi.pojo.auth.RegisterRequest;
import com.bing.researchsurveyextractorapi.pojo.user.UserRequest;
import com.bing.researchsurveyextractorapi.util.AuthUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JWTService jwtService;
    private final AuthenticationManager authenticationManager;

    public static final String SHARED_SECRET_HEADER = "X-RMS-Shared-Secret";
    // Password that shared-login accounts used to be created with; it must never authenticate
    private static final String LEGACY_SHARED_PASSWORD = "shared-login-placeholder";
    private static final SecureRandom RANDOM = new SecureRandom();

    // Only the RMS portal knows this; blank disables shared login entirely
    @Value("${rms.shared-login.secret:}")
    private String sharedLoginSecret;

    public boolean isTrustedPortal(String presentedSecret) {
        if (sharedLoginSecret == null || sharedLoginSecret.isEmpty() || presentedSecret == null) {
            return false;
        }
        return MessageDigest.isEqual(
                sharedLoginSecret.getBytes(StandardCharsets.UTF_8),
                presentedSecret.getBytes(StandardCharsets.UTF_8));
    }

    public AuthenticationResponse register(RegisterRequest request) {
        String authError = null;
        if (userService.checkUserExistsByUsername(request.getUsername())) {
            authError = String.format("Username already exists: %s", request.getUsername());
        } else if (userService.checkUserExistsByEmail(request.getEmail())) {
            authError = String.format("Email already exists: %s", request.getEmail());
        }
        if (authError != null) {
            return AuthenticationResponse.builder()
                    .authToken(authError)
                    .build();
        } else {
            UserRequest user = UserRequest.builder()
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .username(request.getUsername())
                    .password(passwordEncoder.encode(request.getPassword()))
                    .userRole(UserRole.USER)
                    .build();
            User createdUser = userService.createUser(user);
            return generateAuthResponse(createdUser);
        }
    }


    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        String authError;
        if (LEGACY_SHARED_PASSWORD.equals(request.getPassword())) {
            return AuthenticationResponse.builder()
                    .authenticated(false)
                    .authToken("[Bad credentials] Incorrect password!")
                    .build();
        }
        try {
//            1. Find the user, if not we get an exception that user doesn't exist
            User user = userService.loadUserByUsername(request.getUsername());
//            2. Authenticate user's request, if it fails we get an exception that credentials are incorrect (password) since user exists
            authenticationManager.authenticate(createUserAuthToken(request));
//            3. Generate authentication response based on user's details, since we have authenticated and reached this step
            return generateAuthResponse(user);
        } catch (BadCredentialsException badCredentialsException) {
            authError = "[Bad credentials] Incorrect password!";
        } catch (UserDoesNotExistException userDoesNotExistException) {
            authError = String.format("User: %s doesn't exist!", request.getUsername());
        }
        return AuthenticationResponse.builder()
                .authenticated(false)
                .authToken(authError)
                .build();
    }

    public AuthenticationResponse authenticateSharedIdentity(String email, String firstName, String lastName, String username) {
        if (userService.checkUserExistsByEmail(email)) {
            return generateAuthResponse(userService.loadUserByEmail(email));
        }

        String derivedUsername = (username != null && !username.isBlank()) ? username : email.split("@")[0];
        String candidateUsername = derivedUsername;
        int counter = 1;
        while (userService.checkUserExistsByUsername(candidateUsername)) {
            candidateUsername = derivedUsername + counter;
            counter++;
        }

        UserRequest user = UserRequest.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .username(candidateUsername)
                .password(passwordEncoder.encode(randomPassword()))
                .userRole(UserRole.USER)
                .build();
        User createdUser = userService.createUser(user);
        return generateAuthResponse(createdUser);
    }

    public void updatePassword(PasswordChangeRequest request) {
        String username = AuthUtils.getLoggedInUsername();
        authenticationManager.authenticate(createUserAuthToken(getAuthenticationRequest(username, request.getOldPassword())));
        userService.changePassword(username, request.getNewPassword());
    }

    private static AuthenticationRequest getAuthenticationRequest(String username, String password) {
        return new AuthenticationRequest(username, password);
    }

    private static UsernamePasswordAuthenticationToken createUserAuthToken(AuthenticationRequest request) {
        return new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword());
    }

    private AuthenticationResponse generateAuthResponse(User user) {
//        Create ObjectMapper instance
        ObjectMapper mapper = new ObjectMapper();
//        Converting POJO to Map
        Map<String, Object> userJson = mapper.convertValue(UserMapper.toDto(user), new TypeReference<Map<String, Object>>() {
        });
//        Creating auth token
        String authToken = jwtService.generateToken(user, userJson);
        return AuthenticationResponse.builder()
                .authenticated(true)
                .authToken(authToken)
                .build();
    }


    // Shared-login accounts sign in through the portal only, so their password is unguessable
    private static String randomPassword() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
