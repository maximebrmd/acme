# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module CommentProblem
      extend Peal::Internal::Types::Enum

      TEXT = "text"
      NAME = "name"
      EMAIL = "email"
      PARENT = "parent"
      ANCHOR = "anchor"
      SELECTION = "selection"
    end
  end
end
