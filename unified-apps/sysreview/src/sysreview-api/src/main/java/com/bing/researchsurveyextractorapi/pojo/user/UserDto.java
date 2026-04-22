package com.bing.researchsurveyextractorapi.pojo.user;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class UserDto {

    private long userId;
    private String username;
    private String email;
    private String firstName;
    private String lastName;

}
