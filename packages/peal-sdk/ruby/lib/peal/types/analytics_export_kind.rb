# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module AnalyticsExportKind
      extend Peal::Internal::Types::Enum

      POSTS = "posts"
      ACCOUNTS = "accounts"
    end
  end
end
