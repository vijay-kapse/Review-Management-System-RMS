package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.user.UserRequest;
import com.bing.researchsurveyextractorapi.pojo.user.UserUpdateRequest;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

public interface UserService extends UserDetailsService {
    List<User> loadAllUsers();

    User loadUser(long userId);

    User loadUserByUsername(String username);

    User loadUserByEmail(String email);

    User createUser(UserRequest user);

    void changePassword(String username, String newPassword);

    void updateUserDetails(long userId, UserUpdateRequest dto);

    boolean checkUserExistsByUsername(String username);

    boolean checkUserExistsByEmail(String email);

}
