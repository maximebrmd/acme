# frozen_string_literal: true

module Peal
  module InboxReviews
    module Types
      class ListReviewThreadsInboxReviewsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :channel_id, -> { String }, optional: true, nullable: false, api_name: "channelId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :unanswered, -> { Peal::InboxReviews::Types::ListReviewThreadsInboxReviewsRequestUnanswered }, optional: true, nullable: false
      end
    end
  end
end
