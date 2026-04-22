package com.bing.researchsurveyextractorapi.pojo.auth;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class PasswordChangeRequest {
    private String oldPassword;
    private String newPassword;
}
