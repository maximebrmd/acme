# frozen_string_literal: true

module Peal
  module InboxReviews
    module Types
      class SetReviewAnsweredInboxReviewsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :review_id, -> { String }, optional: false, nullable: false, api_name: "reviewId"

        field :answered, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
