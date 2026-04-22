package com.bing.researchsurveyextractorapi.pojo.auth;


import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class AuthenticationRequest {
    private String username;
    private String password;
}
