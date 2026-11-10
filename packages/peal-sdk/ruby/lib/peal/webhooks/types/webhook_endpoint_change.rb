# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class WebhookEndpointChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

        field :description, -> { String }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Peal::Types::SubscribableWebhookEventType] }, optional: true, nullable: false, api_name: "eventTypes"

        field :url, -> { String }, optional: true, nullable: false
      end
    end
  end
end
