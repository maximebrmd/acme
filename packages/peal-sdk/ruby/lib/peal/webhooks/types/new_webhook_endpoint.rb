# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class NewWebhookEndpoint < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :description, -> { String }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Peal::Types::SubscribableWebhookEventType] }, optional: false, nullable: false, api_name: "eventTypes"

        field :url, -> { String }, optional: false, nullable: false
      end
    end
  end
end
