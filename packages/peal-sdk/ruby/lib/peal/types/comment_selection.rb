# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentSelection < Internal::Types::Model
      field :located, -> { Peal::Types::CommentSelectionLocated }, optional: false, nullable: true

      field :quote, -> { String }, optional: false, nullable: false

      field :start, -> { Integer }, optional: false, nullable: false
    end
  end
end
