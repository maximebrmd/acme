# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxModerationAction
      extend Peal::Internal::Types::Enum

      HIDE = "hide"
      UNHIDE = "unhide"
      LIKE = "like"
      UNLIKE = "unlike"
      DELETE = "delete"
    end
  end
end
