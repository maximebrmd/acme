# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class DisconnectAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :connection_id, -> { String }, optional: false, nullable: false, api_name: "connectionId"
      end
    end
  end
end
