# frozen_string_literal: true

module Peal
  module Feeds
    module Types
      class GetFeedsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :feed_id, -> { String }, optional: false, nullable: false, api_name: "feedId"
      end
    end
  end
end
