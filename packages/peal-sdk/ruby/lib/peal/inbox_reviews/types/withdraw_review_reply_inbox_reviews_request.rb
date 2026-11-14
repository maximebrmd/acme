# frozen_string_literal: true

module Peal
  module InboxReviews
    module Types
      class WithdrawReviewReplyInboxReviewsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :review_id, -> { String }, optional: false, nullable: false, api_name: "reviewId"
      end
    end
  end
end
