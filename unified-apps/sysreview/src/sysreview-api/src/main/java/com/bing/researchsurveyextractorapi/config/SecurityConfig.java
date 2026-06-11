package com.bing.researchsurveyextractorapi.config;

import com.bing.researchsurveyextractorapi.filters.JwtAuthenticationFilter;
import lombok.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${allowed.cors.origin.urls}")
    private String[] allowedCorsOrigins;

    @Value("${server.servlet.context-path}")
    private String serverContextPath;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity, AuthenticationProvider authProvider, JwtAuthenticationFilter filter) throws Exception {
        httpSecurity
                .cors()
                    .and()
                .csrf()
                    .disable()
                .authorizeRequests()
                    .antMatchers("/api/v1/auth/**")
                    .permitAll()
                .and()
                .authorizeRequests()
                    .antMatchers("/api/v1/search/datasources")
                    .permitAll()
                .and()
                .authorizeRequests()
                    .antMatchers(
                            "/v2/api-docs",
                            "/configuration/ui",
                            "/swagger-resources/**",
                            "/configuration/security",
                            "/swagger-ui.html",
                            "/swagger-ui",
                            "/swagger-ui/**",
                            "/webjars/**",
                            "/",
                            "/**.json",
                            "/ui/**",
                            "/static/**"
                    )
                    .permitAll()
                .requestMatchers(PathRequest.toStaticResources().atCommonLocations())
                    .permitAll()
                .and()
                .authorizeRequests()
                    .antMatchers("/changePassword/**")
                    .authenticated()
                .anyRequest()
                    .authenticated()
                .and()
                .sessionManagement()
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authenticationProvider(authProvider)
                    .addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class)
                .formLogin()
                    .loginPage(serverContextPath + "/ui/auth")
                .and()
                .logout()
                    .logoutUrl(serverContextPath + "/ui/logout")
//                .addLogoutHandler(logoutHandler)
//                .logoutSuccessHandler((request, response, authentication) -> SecurityContextHolder.clearContext())
        ;

        return httpSecurity.build();
    }

    @Bean
    AuthenticationProvider authenticationProvider(PasswordEncoder passwordEncoder, UserDetailsService userDetailsService) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public WebMvcConfigurer configure() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry corsRegistry) {
                corsRegistry.addMapping("/**")
                        .allowedOrigins(allowedCorsOrigins)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
