package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.mapper.UserMapper;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.user.UserDto;
import com.bing.researchsurveyextractorapi.pojo.user.UserRequest;
import com.bing.researchsurveyextractorapi.pojo.user.UserUpdateRequest;
import com.bing.researchsurveyextractorapi.service.UserService;
import com.bing.researchsurveyextractorapi.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("${API_V1_URI}/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("")
    public List<UserDto> getAllUsers() {
        return userService.loadAllUsers()
                .stream()
                .map(UserMapper::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/loggedInUser")
    public UserDto getLoggedInUserDetails() {
        return UserMapper.toDto(AuthUtils.getLoggedInUser());
    }

    @GetMapping("/{userId}")
    public UserDto getUser(@PathVariable long userId) {
        return UserMapper.toDto(userService.loadUser(userId));
    }

    @GetMapping("/username/{username}")
    public UserDto getUserByUsername(@PathVariable String username) {
        User user = userService.loadUserByUsername(username);
        return UserMapper.toDto(user);
    }

    @GetMapping("/email/{email}")
    public UserDto getUserByEmail(@PathVariable String email) {
        User user = userService.loadUserByEmail(email);
        return UserMapper.toDto(user);
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ADMIN')")
    public void registerUser(UserRequest dto) {
        userService.createUser(dto);
    }

    @PutMapping("/{userId}")
    public void updateUserDetails(@PathVariable long userId, UserUpdateRequest dto) {
        userService.updateUserDetails(userId, dto);
    }

    @GetMapping("/exists/{username}")
    public boolean checkUserExistsByUsername(@PathVariable String username) {
        return userService.checkUserExistsByUsername(username);
    }

    @GetMapping("/exists/email/{email}")
    public boolean checkUserExistsByEmail(@PathVariable String email) {
        return userService.checkUserExistsByEmail(email);
    }
}
