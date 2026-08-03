package com.worklog.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        for (String path : new String[]{
                "/login", "/app", "/logs", "/logs/{date}", "/reviews", "/projects",
                "/settings", "/users", "/change-password"}) {
            registry.addViewController(path).setViewName("forward:/index.html");
        }
    }
}
