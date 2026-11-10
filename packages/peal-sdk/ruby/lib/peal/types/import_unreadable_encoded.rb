# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ImportUnreadableEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::ImportUnreadableEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :column, -> { String }, optional: false, nullable: true

      field :problem, -> { Peal::Types::ImportProblem }, optional: false, nullable: false
    end
  end
end
