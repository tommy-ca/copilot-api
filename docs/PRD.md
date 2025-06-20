# Product Requirements Document

## Overview

This project exposes the GitHub Copilot API through an OpenAI compatible interface. Users can send requests to `/chat/completions`, `/models`, and `/embeddings` as if interacting with the OpenAI API while the server handles all authentication and forwarding to GitHub.

## Goals

- Provide a self‑hosted gateway for Copilot that matches the OpenAI API surface.
- Support command line and Docker based deployment.
- Cache authentication tokens and refresh automatically.
- Offer optional manual approval and rate limiting for requests.
- Remain lightweight and easy to run locally.

## Non‑Goals

- Hosting or provisioning Copilot access.
- Providing free Copilot accounts.

## Success Metrics

- Gateway can be started with minimal configuration.
- Requests made through the gateway return results from Copilot.
- Token refresh and authentication proceed without manual steps once configured.
