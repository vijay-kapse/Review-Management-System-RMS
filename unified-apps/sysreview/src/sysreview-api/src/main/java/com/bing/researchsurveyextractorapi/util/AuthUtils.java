package com.bing.researchsurveyextractorapi.util;

import com.bing.researchsurveyextractorapi.models.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

public class AuthUtils {

    private AuthUtils() {
        throw new IllegalStateException("Utility class");
    }

    public static String getLoggedInUsername() {
        Object principal = getLoggedInPrincipal();
        return (principal instanceof UserDetails) ? ((UserDetails) principal).getUsername() : principal.toString();
    }

    public static User getLoggedInUser() {
        return (User) getLoggedInPrincipal();
    }

    public static Object getLoggedInPrincipal() {
        return SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

}
