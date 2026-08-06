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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import java.io.IOException;
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

    @PatchMapping("/profile")
    public UserResponse updateProfile(@Valid @RequestBody ProfileRequest body, Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        user.setDisplayName(body.displayName());
        return userResponse(users.save(user));
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse uploadAvatar(@RequestPart("file") MultipartFile file, Authentication authentication) throws IOException {
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must not exceed 2 MB");
        }
        byte[] data = file.getBytes();
        String contentType = detectedImageType(data);
        if (contentType == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG and WebP images are supported");
        }
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        user.setAvatar(data, contentType);
        return userResponse(users.save(user));
    }

    @GetMapping("/avatar")
    public ResponseEntity<byte[]> avatar(Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        if (user.getAvatarData() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(user.getAvatarContentType()))
                .cacheControl(CacheControl.noCache())
                .body(user.getAvatarData());
    }

    @DeleteMapping("/avatar")
    public UserResponse removeAvatar(Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        user.removeAvatar();
        return userResponse(users.save(user));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
    }

    @PostMapping("/change-password")
    public ChangePasswordResponse changePassword(@Valid @RequestBody ChangePasswordRequest body, Authentication authentication,
                                                 HttpServletRequest request) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        boolean showGuide = !user.isOnboardingCompleted();
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
        user.completeOnboarding();
        users.save(user);
        request.changeSessionId();
        return new ChangePasswordResponse(showGuide);
    }

    private UserResponse currentUser(Authentication authentication) {
        AppUser user = users.findByUsername(authentication.getName()).orElseThrow();
        return userResponse(user);
    }

    private UserResponse userResponse(AppUser user) {
        return new UserResponse(user.getUsername(), user.getDisplayName(), user.getRole(), user.isMustChangePassword(),
                user.getAvatarData() != null, user.getAvatarVersion());
    }

    private String detectedImageType(byte[] data) {
        if (data.length >= 3 && (data[0] & 0xff) == 0xff && (data[1] & 0xff) == 0xd8 && (data[2] & 0xff) == 0xff) return "image/jpeg";
        if (data.length >= 8 && (data[0] & 0xff) == 0x89 && data[1] == 0x50 && data[2] == 0x4e && data[3] == 0x47) return "image/png";
        if (data.length >= 12 && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') return "image/webp";
        return null;
    }

    public record LoginRequest(@NotBlank @Size(max = 40) String username,
                               @NotBlank @Size(max = 128) String password) {}
    public record ChangePasswordRequest(@Size(max = 128) String currentPassword,
                                        @NotBlank @Size(min = 10, max = 128) String newPassword) {}
    public record ChangePasswordResponse(boolean showGuide) {}
    public record LoginFailure(String message, Integer failedAttempts, Integer remainingAttempts, Instant lockedUntil) {
        static LoginFailure locked(int failedAttempts, Instant lockedUntil) {
            long minutes = Math.max(1, ChronoUnit.MINUTES.between(Instant.now(), lockedUntil) + 1);
            return new LoginFailure("로그인 실패가 10회 누적되어 " + minutes + "분 동안 잠겼습니다.",
                    failedAttempts, 0, lockedUntil);
        }
    }
    public record ProfileRequest(@NotBlank @Size(max = 80) String displayName) {}
    public record UserResponse(String username, String displayName, AppUser.Role role, boolean mustChangePassword,
                               boolean hasAvatar, long avatarVersion) {}
}
