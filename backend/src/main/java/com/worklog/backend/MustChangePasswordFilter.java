package com.worklog.backend;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Set;

@Component
public class MustChangePasswordFilter extends OncePerRequestFilter {
    private static final Set<String> ALLOWED = Set.of(
            "/api/auth/me", "/api/auth/logout", "/api/auth/change-password");
    private final AppUserRepository users;

    public MustChangePasswordFilter(AppUserRepository users) { this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String path = request.getRequestURI();
        if (path.startsWith("/api/") && !path.equals("/api/auth/login")
                && authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            AppUser user = users.findByUsername(authentication.getName()).orElse(null);
            if (user == null || !user.isEnabled()) {
                HttpServletRequest httpRequest = request;
                if (httpRequest.getSession(false) != null) httpRequest.getSession(false).invalidate();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Account is disabled");
                return;
            }
            if (!ALLOWED.contains(path) && user.isMustChangePassword()) {
                response.sendError(428, "Password change required");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
