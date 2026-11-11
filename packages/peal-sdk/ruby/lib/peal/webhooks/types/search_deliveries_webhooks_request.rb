# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class SearchDeliveriesWebhooksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :event_type, -> { Peal::Types::WebhookEventType }, optional: true, nullable: false, api_name: "eventType"

        field :status, -> { Peal::Types::WebhookDeliveryStatus }, optional: true, nullable: false

        field :endpoint_id, -> { String }, optional: true, nullable: false, api_name: "endpointId"

        field :since, -> { String }, optional: true, nullable: false

        field :until_, -> { String }, optional: true, nullable: false, api_name: "until"
      end
    end
  end
end
