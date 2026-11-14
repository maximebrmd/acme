# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class InboxReviewThreadDetail < Internal::Types::Model
      field :abilities, -> { Peal::Types::InboxReviewAbilities }, optional: false, nullable: false

      field :platform, -> { Peal::Types::Platform }, optional: false, nullable: true

      field :replies, -> { Internal::Types::Array[Peal::Types::InboxReviewReply] }, optional: false, nullable: false

      field :reviews, -> { Internal::Types::Array[Peal::Types::InboxReview] }, optional: false, nullable: false

      field :thread, -> { Peal::Types::InboxReviewThread }, optional: false, nullable: false
    end
  end
end
