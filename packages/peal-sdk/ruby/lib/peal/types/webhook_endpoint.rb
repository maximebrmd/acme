# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookEndpoint < Internal::Types::Model
      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :description, -> { String }, optional: false, nullable: false

      field :disabled_at, -> { String }, optional: false, nullable: true, api_name: "disabledAt"

      field :disabled_reason, -> { Peal::Types::WebhookDisabledReason }, optional: false, nullable: true, api_name: "disabledReason"

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :event_types, -> { Internal::Types::Array[Peal::Types::SubscribableWebhookEventType] }, optional: false, nullable: false, api_name: "eventTypes"

      field :failing_since, -> { String }, optional: false, nullable: true, api_name: "failingSince"

      field :id, -> { String }, optional: false, nullable: false

      field :previous_secret_expires_at, -> { String }, optional: false, nullable: true, api_name: "previousSecretExpiresAt"

      field :scope, -> { Peal::Types::WebhookEndpointScope }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"

      field :url, -> { String }, optional: false, nullable: false
    end
  end
end
