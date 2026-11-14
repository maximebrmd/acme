# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReview < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :marked_answered, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "markedAnswered"

      field :photos, -> { Integer }, optional: false, nullable: false

      field :rating, -> { Integer }, optional: false, nullable: false

      field :received_at, -> { String }, optional: false, nullable: false, api_name: "receivedAt"

      field :reply, -> { Peal::Types::InboxOwnerReply }, optional: false, nullable: true

      field :reviewer_name, -> { String }, optional: false, nullable: true, api_name: "reviewerName"

      field :state, -> { Peal::Types::InboxReviewState }, optional: false, nullable: false

      field :text, -> { String }, optional: false, nullable: false

      field :thread_id, -> { String }, optional: false, nullable: false, api_name: "threadId"

      field :updated_at, -> { String }, optional: false, nullable: false, api_name: "updatedAt"

      field :written_at, -> { String }, optional: false, nullable: false, api_name: "writtenAt"
    end
  end
end
