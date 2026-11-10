# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class StatusAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
      end
    end
  end
end
