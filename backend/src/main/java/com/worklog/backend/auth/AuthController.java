package com.worklog.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.worklog.backend.user.AppUser;
import com.worklog.backend.user.AppUserRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final int MAX_LOGIN_ATTEMPTS = 10;
    private static final int LOCK_MINUTES = 15;
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
    @Transactional
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request,
                                   HttpServletResponse response) {
        String username = body.username().trim();
        AppUser user = users.findByUsernameForLogin(username).orElse(null);
        Instant now = Instant.now();
        if (user != null && !user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new LoginFailure(
                    "비활성화된 계정입니다. 관리자에게 문의해 주세요.",
                    null, null, null));
        }
        if (user != null && user.isLoginLocked(now)) {
            return ResponseEntity.status(HttpStatus.LOCKED).body(LoginFailure.locked(user.getFailedLoginAttempts(), user.getLoginLockedUntil()));
        }
        if (user != null && user.getLoginLockedUntil() != null) {
            user.resetLoginFailures();
            users.save(user);
        }
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            user == null ? username : user.getUsername(), body.password()));
        } catch (AuthenticationException exception) {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginFailure("아이디 또는 비밀번호를 확인해 주세요.", null, null, null));
            }
            user.recordLoginFailure(MAX_LOGIN_ATTEMPTS, now.plus(LOCK_MINUTES, ChronoUnit.MINUTES));
            users.save(user);
            if (user.getFailedLoginAttempts() >= MAX_LOGIN_ATTEMPTS) {
                return ResponseEntity.status(HttpStatus.LOCKED).body(LoginFailure.locked(user.getFailedLoginAttempts(), user.getLoginLockedUntil()));
            }
            int remaining = MAX_LOGIN_ATTEMPTS - user.getFailedLoginAttempts();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginFailure(
                    "아이디 또는 비밀번호를 확인해 주세요.",
                    user.getFailedLoginAttempts(), remaining, null));
        }
        if (user != null) {
            user.resetLoginFailures();
            users.save(user);
        }
        request.getSession(true);
        request.changeSessionId();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return ResponseEntity.ok(currentUser(authentication));
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
    public record LoginFailure(String message, Integer failedAttempts, Integer remainingAttempts, Instant lockedUntil) {
        static LoginFailure locked(int failedAttempts, Instant lockedUntil) {
            long minutes = Math.max(1, ChronoUnit.MINUTES.between(Instant.now(), lockedUntil) + 1);
            return new LoginFailure("로그인 실패가 10회 누적되어 " + minutes + "분 동안 잠겼습니다.",
                    failedAttempts, 0, lockedUntil);
        }
    }
    public record UserResponse(String username, String displayName, AppUser.Role role, boolean mustChangePassword) {}
}
