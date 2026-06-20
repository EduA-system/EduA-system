package com.edua.beeduasystem.service;

import com.edua.beeduasystem.domain.model.ApplicationHealth;
import org.springframework.stereotype.Service;

@Service
public class HealthService {

    public ApplicationHealth getHealth() {
        return new ApplicationHealth("UP", "be-edua-system");
    }
}
