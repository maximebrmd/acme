# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewCommentResolved < Internal::Types::Model
      field :at, -> { String }, optional: false, nullable: false

      field :by, -> { Peal::Types::Reviewer }, optional: false, nullable: false
    end
  end
end
