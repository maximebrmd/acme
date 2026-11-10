# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostReview < Internal::Types::Model
      field :approvals, -> { Internal::Types::Array[Peal::Types::ApprovalRequest] }, optional: false, nullable: false

      field :comments, -> { Internal::Types::Array[Peal::Types::ReviewComment] }, optional: false, nullable: false
    end
  end
end
