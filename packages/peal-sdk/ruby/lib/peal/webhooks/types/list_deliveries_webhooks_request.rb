# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class ListDeliveriesWebhooksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :endpoint_id, -> { String }, optional: false, nullable: false, api_name: "endpointId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
