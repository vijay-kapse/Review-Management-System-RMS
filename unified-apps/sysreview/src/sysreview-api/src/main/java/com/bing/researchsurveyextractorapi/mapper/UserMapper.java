package com.bing.researchsurveyextractorapi.mapper;

import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.user.UserDto;
import com.bing.researchsurveyextractorapi.pojo.user.UserRequest;

public class UserMapper {

    private UserMapper() {
        throw new IllegalStateException("Mapper class");
    }

    public static User fromRequest(UserRequest userRequest) {
        return User
                .builder()
                .firstName(userRequest.getFirstName())
                .lastName(userRequest.getLastName())
                .email(userRequest.getEmail())
                .username(userRequest.getUsername())
                .password(userRequest.getPassword())
                .role(userRequest.getUserRole())
                .build();
    }

    public static UserDto toDto(User user) {
        return UserDto.builder()
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .username(user.getUsername())
                .build();
    }
}
