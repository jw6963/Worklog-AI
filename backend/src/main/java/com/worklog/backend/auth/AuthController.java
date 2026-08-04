package com.worklog.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.worklog.backend.user.AppUser;
import com.worklog.backend.user.AppUserRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final HttpSessionSecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(AuthenticationManager authenticationManager, AppUserRepository users,
                          PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
                              HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(body.username().trim(), body.password()));
        request.getSession(true);
        request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return currentUser(authentication);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return currentUser(authentication);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest body, Authentication authentication,
                               HttpServletRequest request) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        if (!user.isMustChangePassword()
                && (body.currentPassword() == null || !passwordEncoder.matches(body.currentPassword(), user.getPasswordHash()))) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (body.newPassword().length() < 10) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 10 characters");
        }
        if (passwordEncoder.matches(body.newPassword(), user.getPasswordHash())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different");
        }
        user.setPassword(passwordEncoder.encode(body.newPassword()), false);
        users.save(user);
        request.changeSessionId();
    }

    private UserResponse currentUser(Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        return new UserResponse(user.getUsername(), user.getDisplayName(), user.getRole(), user.isMustChangePassword());
    }

    public record LoginRequest(@NotBlank @Size(max = 40) String username,
                               @NotBlank @Size(max = 128) String password) {}
    public record ChangePasswordRequest(@Size(max = 128) String currentPassword,
                                        @NotBlank @Size(min = 10, max = 128) String newPassword) {}
    public record UserResponse(String username, String displayName, AppUser.Role role, boolean mustChangePassword) {}
}
