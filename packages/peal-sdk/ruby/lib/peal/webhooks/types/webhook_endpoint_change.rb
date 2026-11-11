# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class WebhookEndpointChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelIds"

        field :description, -> { String }, optional: true, nullable: false

        field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :event_types, -> { Internal::Types::Array[Peal::Types::SubscribableWebhookEventType] }, optional: true, nullable: false, api_name: "eventTypes"

        field :headers, -> { Internal::Types::Array[Peal::Types::WebhookHeaderChange] }, optional: true, nullable: false

        field :url, -> { String }, optional: true, nullable: false

        field :workspace_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "workspaceIds"
      end
    end
  end
end
