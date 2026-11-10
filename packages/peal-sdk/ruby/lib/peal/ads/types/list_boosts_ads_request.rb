# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class ListBoostsAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :post_id, -> { String }, optional: true, nullable: false, api_name: "postId"
      end
    end
  end
end
