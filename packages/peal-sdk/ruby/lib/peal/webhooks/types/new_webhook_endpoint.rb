# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class NewWebhookEndpoint < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelIds"

        field :description, -> { String }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Peal::Types::SubscribableWebhookEventType] }, optional: false, nullable: false, api_name: "eventTypes"

        field :headers, -> { Internal::Types::Array[Peal::Types::WebhookHeader] }, optional: true, nullable: false

        field :scope, -> { Peal::Types::WebhookEndpointScope }, optional: true, nullable: false

        field :url, -> { String }, optional: false, nullable: false

        field :workspace_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "workspaceIds"
      end
    end
  end
end
