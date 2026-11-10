# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostNotReviewableEncoded < Internal::Types::Model
      field :status, -> { Peal::Types::PostNotReviewableEncodedStatus }, optional: false, nullable: false
    end
  end
end
