# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class PauseBoostAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :boost_id, -> { String }, optional: false, nullable: false, api_name: "boostId"
      end
    end
  end
end
