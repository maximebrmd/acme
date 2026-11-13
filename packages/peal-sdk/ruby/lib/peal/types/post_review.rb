# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostReview < Internal::Types::Model
      field :approvals, -> { Internal::Types::Array[Peal::Types::ApprovalRequest] }, optional: false, nullable: false

      field :channels, -> { Internal::Types::Array[Peal::Types::ReviewedChannel] }, optional: false, nullable: false

      field :comments, -> { Internal::Types::Array[Peal::Types::ReviewComment] }, optional: false, nullable: false

      field :media, -> { Internal::Types::Array[Peal::Types::ReviewedMedia] }, optional: false, nullable: false

      field :poll, -> { Peal::Types::Poll }, optional: true, nullable: false
    end
  end
end
