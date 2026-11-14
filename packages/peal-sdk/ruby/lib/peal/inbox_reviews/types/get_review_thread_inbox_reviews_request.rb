# frozen_string_literal: true

module Peal
  module InboxReviews
    module Types
      class GetReviewThreadInboxReviewsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :thread_id, -> { String }, optional: false, nullable: false, api_name: "threadId"
      end
    end
  end
end
