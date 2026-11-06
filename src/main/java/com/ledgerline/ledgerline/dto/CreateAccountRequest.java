
package com.ledgerline.ledgerline.dto;

import jakarta.validation.constraints.Pattern;

public class CreateAccountRequest {

    @Pattern(
        regexp = "INR",
        message = "Only INR currency is supported"
    )
    private String currency = "INR";

    public CreateAccountRequest() {
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
