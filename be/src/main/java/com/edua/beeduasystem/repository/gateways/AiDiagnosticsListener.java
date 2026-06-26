package com.edua.beeduasystem.repository.gateways;

/**
 * Hook for streaming AI provider attempts to interested consumers (e.g. slide STOMP topic).
 */
public interface AiDiagnosticsListener {

    AiDiagnosticsListener NO_OP = new AiDiagnosticsListener() {
    };

    default void onProviderAttempt(String provider) {
    }

    default void onProviderFailed(String provider, String message) {
    }

    default void onProviderSucceeded(String provider) {
    }
}
