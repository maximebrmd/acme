# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class RedeliverWebhooksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

        field :delivery_id, -> { String }, optional: false, nullable: false, api_name: "deliveryId"
      end
    end
  end
end
