package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.pojo.auth.AuthenticationRequest;
import com.bing.researchsurveyextractorapi.pojo.auth.AuthenticationResponse;
import com.bing.researchsurveyextractorapi.pojo.auth.PasswordChangeRequest;
import com.bing.researchsurveyextractorapi.pojo.auth.RegisterRequest;
import com.bing.researchsurveyextractorapi.pojo.user.UserDto;
import com.bing.researchsurveyextractorapi.service.AuthenticationService;
import com.bing.researchsurveyextractorapi.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        AuthenticationResponse response = authenticationService.register(request);
        HttpStatus status = response.isAuthenticated() ? HttpStatus.OK : HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status).body(response);
    }

    @PostMapping(value = "/signin", consumes = {"application/json"})
    public ResponseEntity<AuthenticationResponse> login(@RequestBody AuthenticationRequest request) {
        AuthenticationResponse response = authenticationService.authenticate(request);
        HttpStatus status = response.isAuthenticated() ? HttpStatus.OK : HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/shared-login")
    public ResponseEntity<AuthenticationResponse> sharedLogin(
            @RequestHeader(value = AuthenticationService.SHARED_SECRET_HEADER, required = false) String sharedSecret,
            @RequestParam String email,
            @RequestParam(required = false, defaultValue = "Shared") String firstName,
            @RequestParam(required = false, defaultValue = "User") String lastName,
            @RequestParam(required = false) String username
    ) {
        if (!authenticationService.isTrustedPortal(sharedSecret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        AuthenticationResponse response = authenticationService.authenticateSharedIdentity(email, firstName, lastName, username);
        HttpStatus status = response.isAuthenticated() ? HttpStatus.OK : HttpStatus.UNAUTHORIZED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/shared-login/exists")
    public ResponseEntity<Boolean> sharedLoginUserExists(
            @RequestHeader(value = AuthenticationService.SHARED_SECRET_HEADER, required = false) String sharedSecret,
            @RequestParam String email) {
        if (!authenticationService.isTrustedPortal(sharedSecret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(userService.checkUserExistsByEmail(email));
    }

    @PostMapping("/changePassword")
    public void changePassword(@RequestBody PasswordChangeRequest request) {
        authenticationService.updatePassword(request);
    }
}
