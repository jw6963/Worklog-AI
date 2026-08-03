package com.worklog.backend;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AppUserRepository users) {
        return username -> users.findByUsername(username)
                .map(user -> User.withUsername(user.getUsername())
                        .password(user.getPasswordHash())
                        .disabled(!user.isEnabled())
                        .roles(user.getRole().name())
                        .build())
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(username));
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService details, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(details);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, MustChangePasswordFilter passwordFilter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/error").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, exception) ->
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .addFilterBefore(passwordFilter, AuthorizationFilter.class)
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    CommandLineRunner seedAdmin(AppUserRepository users, WorkItemRepository items, ProjectRepository projects,
                                PasswordEncoder encoder,
                                @Value("${worklog.admin.username}") String username,
                                @Value("${worklog.admin.password}") String password,
                                @Value("${worklog.admin.display-name}") String displayName) {
        return args -> {
            if (users.findByUsername(username).isEmpty()) {
                if (password == null || password.isBlank()) {
                    throw new IllegalStateException(
                            "WORKLOG_ADMIN_PASSWORD is required when creating the initial administrator");
                }
                users.save(new AppUser(username, encoder.encode(password), displayName, AppUser.Role.ADMIN, false));
            }
            AppUser admin = users.findByUsername(username).orElseThrow();
            if (admin.getRole() != AppUser.Role.ADMIN) {
                admin.setRole(AppUser.Role.ADMIN);
                users.save(admin);
            }
            List<Project> unownedProjects = projects.findByOwnerIsNull();
            unownedProjects.forEach(project -> project.setOwner(admin));
            projects.saveAll(unownedProjects);
            List<WorkItem> unownedItems = items.findByOwnerIsNull();
            unownedItems.forEach(item -> item.setOwner(admin));
            items.saveAll(unownedItems);
        };
    }
}
