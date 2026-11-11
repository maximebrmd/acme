# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class WebhookDelivery < Internal::Types::Model
      field :attempts, -> { Integer }, optional: false, nullable: false

      field :completed_at, -> { String }, optional: false, nullable: true, api_name: "completedAt"

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :duration_ms, -> { Integer }, optional: false, nullable: true, api_name: "durationMs"

      field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

      field :error, -> { Peal::Types::WebhookAttemptError }, optional: false, nullable: true

      field :event_id, -> { String }, optional: false, nullable: false, api_name: "eventId"

      field :event_type, -> { Peal::Types::WebhookEventType }, optional: false, nullable: false, api_name: "eventType"

      field :failure_reason, -> { Peal::Types::WebhookDeliveryFailure }, optional: false, nullable: true, api_name: "failureReason"

      field :id, -> { String }, optional: false, nullable: false

      field :last_attempt_at, -> { String }, optional: false, nullable: true, api_name: "lastAttemptAt"

      field :next_attempt_at, -> { String }, optional: false, nullable: true, api_name: "nextAttemptAt"

      field :redelivery_of, -> { String }, optional: false, nullable: true, api_name: "redeliveryOf"

      field :response_excerpt, -> { String }, optional: false, nullable: true, api_name: "responseExcerpt"

      field :response_status, -> { Integer }, optional: false, nullable: true, api_name: "responseStatus"

      field :status, -> { Peal::Types::WebhookDeliveryStatus }, optional: false, nullable: false

      field :workspace_external_id, -> { String }, optional: false, nullable: true, api_name: "workspaceExternalId"

      field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
    end
  end
end
