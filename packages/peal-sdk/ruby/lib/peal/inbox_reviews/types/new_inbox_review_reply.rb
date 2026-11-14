# frozen_string_literal: true

module Peal
  module InboxReviews
    module Types
      class NewInboxReviewReply < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :review_id, -> { String }, optional: false, nullable: false, api_name: "reviewId"

        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
