# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TooManyReviewLinksEncoded < Internal::Types::Model
      field :limit, -> { Integer }, optional: false, nullable: false
    end
  end
end
