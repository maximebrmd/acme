# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CommentSelectionLocated < Internal::Types::Model
      field :end_, -> { Integer }, optional: false, nullable: false, api_name: "end"

      field :start, -> { Integer }, optional: false, nullable: false
    end
  end
end
