package com.worklog.backend;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    private final AppUserRepository users;
    public CurrentUser(AppUserRepository users) { this.users = users; }
    public AppUser get(Authentication authentication) {
        if (authentication == null) throw new IllegalStateException("Authentication is required");
        return users.findByUsername(authentication.getName()).orElseThrow();
    }
}
