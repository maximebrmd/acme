# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentInvalidEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::CommentInvalidEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :problem, -> { Peal::Types::CommentProblem }, optional: false, nullable: false
    end
  end
end
