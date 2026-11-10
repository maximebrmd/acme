# frozen_string_literal: true

require_relative "../../../peal"

module Peal
  module Review
    module Types
      class NewCommentAnchorSelection < Internal::Types::Model
        field :quote, -> { String }, optional: false, nullable: false

        field :start, -> { Integer }, optional: false, nullable: false
      end
    end
  end
end
